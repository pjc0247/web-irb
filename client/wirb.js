/*
	wirb.js
*/

_tabs = null;
_tab_count = 2;
_active_tab = null;
_buf = "";
_ws = new WS("ws://localhost:9917");

slice = function(msg){
	pn = 0;
    data = 0;
    for(i=0;i<msg.length;i++){
            if( msg[i] == ':' ){
                    pn = parseInt( msg.substring(0,i) );
                    data = msg.substring(i+1, msg.length);
                    break;
            }
    }

	return [pn, data];
}

append_text = function(div, text){
	div.innerText += text; 
	if (div.scrollTop < div.scrollHeight - div.clientHeight)
		div.scrollTop = div.scrollHeight - div.clientHeight;
}

init_tab = function(tab){
	var sid = (Math.random()*10000).toFixed(0);

	tab._buf = "";
	tab._sid = sid;
	tab._ln = 2;
	tab._lv = 0;
	tab._history = new Array();
	tab._history_cur = 0;
	tab._writeable = true;

	// 货 技记 积己 夸没
	_ws.send( CreateSession, sid );
}
active_tab = function(tab){
	_active_tab = tab;
}

init = function(){
	add_tab = document.getElementById("tab_add");

	add_tab.onclick = function(e){
		if( _tab_count == 7 ) return;

		var tab = document.createElement('li');
		
		tab.innerHTML = "<a href=\"#\">workspace" + _tab_count + "</a>"

		_tab_count += 1;

		var parent = add_tab.parentNode;
		parent.appendChild( tab );
		parent.removeChild( add_tab );
		parent.appendChild( add_tab );

		_tabs = document.getElementsByClassName("tab_content");
	}

	_tabs = document.getElementsByClassName("tab_content");
	for( i=0;i<_tabs.length-1;i++ )
		init_tab( _tabs[i] );
	active_tab( _tabs[0] );

    _tabs[1].onmousemove = function(e){
		console.log(e);
	}
	document.body.onkeypress = function(e){
		if( _active_tab != null ){
			var k = e.keyCode;

			if( _active_tab._writeable != true ) return;

			if( k == 13 ){
				ln = _active_tab._ln;
				
				_active_tab._writeable = false;
				append_text( _active_tab, "\n" );

				_ws.send( Eval, _active_tab._sid + ":" + _active_tab._buf )

				for(i=0;i<_active_tab._history.length;i++){
					if( _active_tab._history[i] == _active_tab._buf ){
						_active_tab._history.splice( i,1);
						break;
					}
				}
				_active_tab._history.push( _active_tab._buf );
				_active_tab._history_cur = _active_tab._history.length-1;

				_active_tab._buf = "";
			}
			else{
				var t = String.fromCharCode( e.keyCode );
				_active_tab._buf += t;
				_active_tab.innerText += t;
			}
		}
	}
	document.body.onkeydown = function(e){
		if( e.keyCode == 8 ){
			
			if( _active_tab._buf.length != 0 )
				_active_tab.innerText = _active_tab.innerText.slice(0,-1);
			_active_tab._buf = _active_tab._buf.slice(0,-1);
			return false;
		}
		// history
		else if( e.keyCode == 38 ){
			t = _active_tab;
			
			t.innerText = t.innerText.substring( 0, t.innerText.length - (t._buf.length) );
			append_text( t, t._history[ t._history_cur ] );
			t._buf = t._history[ t._history_cur ];

			if( t._history_cur != 0 )
				t._history_cur -= 1;
		}
		else if( e.keyCode == 40 ){
			t = _active_tab;
			
			if( t._history_cur != t._history.length-1 )
				t._history_cur += 1;

			t.innerText = t.innerText.substring( 0, t.innerText.length - (t._buf.length) );
			append_text( t, t._history[ t._history_cur ] );
			t._buf = t._history[ t._history_cur ];
		}
	}
}

init_ws = function(){
	var w = document.getElementById("wait");

	_ws.bind( "open", function(e){
		var opa = 0.6;

		var t = setInterval( function(){
			w.style.opacity = opa;
			opa -= 0.025;

			if( opa <= 0 ){
				clearInterval( t );

				document.body.removeChild( w );
			}
		}, 3);

		init();
	});
	_ws.bind( "close", function(e){
		w.style.opacity = 0.6;
		w.innerHTML = "<div>connection lost</div>";
		document.body.appendChild( w );
		console.log(w);
	});

	_ws.bind( SessionId, function(msg){
	});

	// on eval result
	_ws.bind( EvalResult, function(msg){
		r = slice(msg);

		if( r[1].length == 0 ) return;
		
		for(i=0;i<_tabs.length;i++){
			if( _tabs[i]._sid == r[0] ){
				append_text( _tabs[i], r[1] + "\n" );
				break;
			}
		}
	});
	_ws.bind( EvalError, function(msg){
		r = slice(msg);

		if( r[1].length == 0 ) return;
		
		for(i=0;i<_tabs.length;i++){
			if( _tabs[i]._sid == r[0] ){
				append_text( _tabs[i], "ERROR : " + r[1] + "\n" ); 
				break;
			}
		}
	});
	_ws.bind( EvalLevelChanged, function(msg){
		r = slice(msg);
		
		for(i=0;i<_tabs.length;i++){
			if( _tabs[i]._sid == r[0] ){
				_tabs[i]._lv = r[1];
				break;
			}
		}
	});
	_ws.bind( EndResult, function(msg){
		for(i=0;i<_tabs.length;i++){
			if( _tabs[i]._sid == msg ){
				ln = _tabs[i]._ln;
				lv = _tabs[i]._lv;
				_tabs[i]._writeable = true;
				_tabs[i]._ln += 1;

				append_text( _tabs[i], "irb(main):" + Math.floor(ln/100).toFixed(0) + Math.floor(ln%100/10).toFixed(0) + Math.floor(ln%10).toFixed(0) + ":" + lv + "> " ); 
				break;
			}
		}
	});
}

init_ws();