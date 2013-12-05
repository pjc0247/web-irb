/*
	ws.js
*/

function WS(host){
        this.ws = new WebSocket(host);
        this.ws.parent = this;

        this.connected = false;
        this.handler = new Array();

        this.ws.onopen = function(e){
                this.connected = true;
                this.parent.handle( -1, e );
        }
        this.ws.onclose = function(e){
                if( this.connected == true ){
                        this.connected = false;
                        this.parent.handle( -2, e );
                }
        }
        this.ws.onerror = function(e){
                this.parent.handle( -3, e );
        }
        this.ws.onmessage = function(msg){
                pn = 0;
                data = 0;
                for(i=0;i<msg.data.length;i++){
                        if( msg.data[i] == ':' ){
                                pn = parseInt( msg.data.substring(0,i) );
                                data = msg.data.substring(i+1, msg.data.length);
                                break;
                        }
                }

                this.parent.handle( -4, msg );
                this.parent.handle( pn, data );
        }

        this.close = function(){
                this.ws.close();
        }
        this.send = function( pn, msg ){
                this.ws.send( pn + ":" + msg );
        }
        this.bind = function( pn, handler ){
                if( pn == "open" )
                        this.handler[-1] = handler;
                else if( pn == "close" )
                        this.handler[-2] = handler;
                else if ( pn == "error" )
                        this.handler[-3] = handler;
                else if ( pn == "message" )
                        this.handler[-4] = handler;
                else
                        this.handler[pn] = handler;
        }
        this.handle = function( pn, data ){
                if( this.handler[pn] != null ){
                        this.handler[pn] (data);
                }
        }
}