require 'spec_helper'

describe 'Gitlab::SnippetRepo' do
  let (:filename) { 'snippet_' + Time.now.to_i.to_s + rand(300).to_s.rjust(3, '0') }
  let (:snippet_repo) { Gitlab::SnippetRepo.new(snippet_path) }
  let (:snippet_path) do 
    path = Rails.root.join('tmp', 'test_snippets', filename).to_s 
    FileUtils.mkdir_p path unless Dir.exists? path
    path
  end

  it "should create new snippet repository by path" do
    new_snippet_repo = Gitlab::SnippetRepo.new(snippet_path)

    new_snippet_repo.repo.should be_a_kind_of(Grit::Repo)
  end

  it "should create new snippet repository by path with author" do
    new_snippet_repo = Gitlab::SnippetRepo.new(snippet_path, "user", "user@user.user")

    FileUtils.touch File.join(snippet_repo.path, filename)

    snippet_repo.add_file filename, 'test content'

    snippet_repo.repo.log.first.author.name.should  eq "user"
    snippet_repo.repo.log.first.author.email.should eq "user@user.user"
    snippet_repo.repo.log.first.committer.name.should  eq "user"
    snippet_repo.repo.log.first.committer.email.should eq "user@user.user"
  end

  it "should initialize snippet repository by path" do
    snippet_repo.repo.should be_a_kind_of(Grit::Repo)
  end

  it "should add the file to the snippet repository" do
    snippet_repo.add_file filename, 'test content'
    snippet_repo.repo.log.first.message.should eq "Added #{filename}"
  end

  it "should delete the file from the snipept repository" do
    FileUtils.touch File.join(snippet_repo.path, filename)

    snippet_repo.add_file filename, 'test content'

    snippet_repo.update_file filename, 'new test content'

    snippet_repo.repo.log.first.message.should eq "Updated #{filename}"
  end

  it "should update the file in the snippet repository" do
    FileUtils.touch File.join(snippet_repo.path, filename)

    snippet_repo.add_file filename, 'test content'

    snippet_repo.delete_file filename

    snippet_repo.repo.log.first.message.should eq "Deleted #{filename}"
  end
end
