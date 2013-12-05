require 'em-websocket'
require 'stringio'

load 'protocol.rb'
load 'reflector.rb'

$clients = Array.new
$session = Hash.new
$level = Hash.new
$buf = Hash.new

$_stdout = StringIO.new
$stdout = $_stdout

def gb(_sid)
    def help
      puts "Web Interactive Ruby Interpreter\n\n"
      puts "  _sid : current session's id"
    end

  return binding
end
def slice(msg)
   pn = 0
   data = 0
   for i in 0..msg.length
     if msg[i] == ':'
       pn = msg.slice(0, i)
       data = msg.slice(i+1, msg.length)
       break
     end
   end

   return pn,data
end

EM.run {
  EM::WebSocket.run(:host => "0.0.0.0", :port => 9917) do |ws|

    ws.onopen { |handshake|
      $clients.push ws
    $session[ws] = Hash.new

       ws.send "100:welcome"
    }
    ws.onclose {
      $clients.delete ws        
    }
    ws.onmessage { |msg|
      pn, data = slice(msg)

    case pn.to_i
    when CreateSession
      b = gb(data)
      $session[ws][data] = b
      $level[b] = 0
      $buf[b] = ""
    when Eval
      sid, es = slice(data)
  
      b = $session[ws][sid]

      $_stdout.string = ""

      begin
        reflector = Reflector.new( $buf[b] + es )
      
        e = false

        if reflector.level != $level[b]
          ws.send "#{EvalLevelChanged}:#{sid}:#{reflector.level}"
        end
        if reflector.syntax_error? == true
          ws.send "#{EvalError}:#{sid}:#{reflector.syntax_error}"
          e = true
        elsif reflector.level == 0
          ret = b.eval( $buf[b] + es )

          $buf[b] = ""
          e = true
        end
      
        $buf[b] += es + "\n" if e == false
        $level[b] = reflector.level
      rescue
        ws.send "#{EvalError}:#{sid}:#{$!}"
      end
      out = $_stdout.string

      if out[out.length-1] == "\n"
        out.chop!
      end

      ws.send "#{EvalResult}:#{sid}:#{out}" if out != ""
      ws.send "#{EvalResult}:#{sid}:=>#{ret}" if ret != nil
      ws.send "#{EndResult}:#{sid}"
    end
    }
  end
}