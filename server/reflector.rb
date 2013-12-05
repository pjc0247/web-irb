require 'ripper'

class Reflector < Ripper::SexpBuilder
   attr_accessor :code_block
   def initialize(source)
     super
     @code_block = @terminate = @syntax_error =  @in_string = @in_regexp = @in_array = nil
     
     @level = 0
     parsed = !parse.nil?
     @level = 0 if @level < 0
     @code_block = parsed && !@in_string && !@in_regexp && !@in_array
   end
   
   # Returns the code block indentation level.
   #
   #   Reflector.new("").level # => 0
   #   Reflector.new("class Foo").level # => 1
   #   Reflector.new("class Foo; def foo").level # => 2
   #   Reflector.new("class Foo; def foo; end").level # => 1
   #   Reflector.new("class Foo; def foo; end; end").level # => 0
   attr_reader :level
   
   # Returns the actual syntax error message if one occurs.
   attr_reader :syntax_error
   
   # Returns whether or not the source is a valid code block, but does not
   # take syntax errors into account. In short, it's a valid code block if
   # after parsing the level is at zero.
   #
   # For example, this is not a valid full code block:
   #
   #   def foo; p :ok
   #
   # This however is:
   #
   #   def foo; p :ok; end
   def code_block?
     @code_block
   end
   
   # Returns whether or not the source contains a syntax error. However, it
   # ignores a syntax error resulting in a code block not ending yet.
   #
   # For example, this contains a syntax error:
   #
   #   def; foo
   #
   # This does not:
   #
   #   def foo
   def syntax_error?
     !@syntax_error.nil?
   end

   # Returns whether or not the source contains a call to toplevel
   # quit or exit, namely if the current session should be terminated
   #
   # For example, this would terminate the session
   #
   #   def foo; end; quit
   #
   # This does not:
   #
   #   def foo; quit; end
   def terminate?
     !@terminate.nil?
   end
   
   UNEXPECTED_END = "syntax error, unexpected $end"
   
   def on_parse_error(error) #:nodoc:
     if code_block? || !error.start_with?(UNEXPECTED_END)
       @syntax_error = error
     end
   end
   
   INCREASE_LEVEL_KEYWORDS = %w{ class module def begin if unless case while for do }
   TERMINATE_KEYWORDS = %w{ exit quit }
   
   def on_kw(token) #:nodoc:
     case token
     when *INCREASE_LEVEL_KEYWORDS
       @level += 1
     when "end"
       @level -= 1
     end
     super
   end
   
   def on_lbracket(token) #:nodoc:
     @level += 1
     super
   end
   
   def on_rbracket(token) #:nodoc:
     @level -= 1
     super
   end
   
   def on_embexpr_beg(token) #:nodoc:
     @level += 1
     super
   end

   def on_ident(token) #:nodoc:
     if @level == 0 && TERMINATE_KEYWORDS.include?(token)
       @terminate = true
     else
       super
     end
   end
   
   def on_lbrace(token) #:nodoc:
     @level += 1
     super
   end
   
   def on_rbrace(token) #:nodoc:
     @level -= 1
     super
   end

   def on_tstring_beg(token)
     @in_string = token
     @level += 1
     super
   end

   def on_tstring_end(token)
     if @in_string && tokens_match?(@in_string, token)
       @in_string = nil
       @level -= 1
     end
     super
   end

   def on_qwords_beg(token)
     @in_array = token.strip
     @level += 1
     super
   end
   alias_method :on_words_beg, :on_qwords_beg

   def on_words_sep(token)
     if tokens_match?(@in_array, token)
       @in_array = false
       @level -= 1
     end
     super
   end

   def on_regexp_beg(token)
     @in_regexp = token
     @level += 1
     super
   end

   def on_regexp_end(token)
     token_without_regexp_options = token[0,1]
     if tokens_match?(@in_regexp, token_without_regexp_options)
       @in_regexp = false
       @level -= 1
     end
     super
   end

   def tokens_match?(open_token, close_token)
     last_char_open_token = open_token[-1, 1]
     last_char_close_token = close_token[-1, 1]
     if last_char_open_token == last_char_close_token
       true
     else
       case last_char_open_token
       when '{' then last_char_close_token == '}'
       when '(' then last_char_close_token == ')'
       when '[' then last_char_close_token == ']'
       else
         false
       end
     end
   end
 end
