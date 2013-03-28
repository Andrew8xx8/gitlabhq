module Gitlab
  class SnippetRepo
    attr_reader :path, :repo

    def initialize(path)
      @path = path

      @repo = Grit::Repo.new path
    rescue Grit::InvalidGitRepositoryError, Grit::NoSuchPathError
      @repo = Grit::Repo.init path
    end

    def add_file(filename, content)
      Dir.chdir(@path) do
        File.open(filename, 'w') { |f| f.write(content) }

        @repo.add(filename)
        @repo.commit_index("Added #{filename}")
      end
    end

    def update_file(filename, content)
      Dir.chdir(@path) do
        File.open(filename, 'w') { |f| f.write(content) }

        @repo.add(filename)
        @repo.commit_index("Updated #{filename}")
      end
    end

    def delete_file(filename)
      Dir.chdir(@path) do
        @repo.remove(filename)
        @repo.commit_index("Deleted #{filename}")
      end
    end
  end
end
