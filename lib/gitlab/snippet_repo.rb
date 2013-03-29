module Gitlab
  class CannotCreateSnippetRepo < StandardError
  end

  class SnippetRepo
    attr_reader :path, :repo

    def initialize(path, name = nil, email = nil)
      @path = path

      init_repo path

      change_author(name, email) if name.present? && email.present?
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

    def destroy
      FileUtils.rm_rf @path
      @path = nil
    end

    protected

    def change_author(name, email)
      @repo.git.config({}, "user.name", name)
      @repo.git.config({}, "user.email", email)
    end

    def init_repo(path)
      @repo = Grit::Repo.new path
    rescue Grit::InvalidGitRepositoryError, Grit::NoSuchPathError
      @repo = Grit::Repo.init path
    end
  end
end
