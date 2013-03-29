module Snippets
  class CreateContext
    attr_accessor :snippet, :current_user, :params

    def initialize(user, params)
      @current_user, @params = user, params.dup
    end

    def execute
      klass = params[:type].to_s.camelize.constantize

      @snippet = klass.new(params)
      @snippet.project = params[:project] if params.has_key? :project
      @snippet.author = current_user

      if @snippet.valid?
        # Make snippet dir
        FileUtils.mkdir_p @snippet.path unless Dir.exists? @snippet.path

        snippet_repo = Gitlab::SnippetRepo.new @snippet.path
      end

      @snippet.save

      @snippet
    rescue => ex
      @snippet.errors.add(:base, "Can't save project. Please try again later")
      @snippet
    end
  end
end
