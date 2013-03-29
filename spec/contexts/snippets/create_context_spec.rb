require 'spec_helper'

describe Snippets::CreateContext do
  describe :create do
    before do
      @user = create :user
      @opts = {
        title: "test snippet"
      }
    end

    context 'personal snippet' do
      before do
        @opts[:type] = :personal_snippet
        @snippet = create_snippet(@user, @opts)
      end

      it { @snippet.should be_valid }
      it { @snippet.author.should == @user }
    end

    context 'project snippet' do
      before do
        @opts[:project] = create :project
        @opts[:type] = :project_snippet
        @snippet = create_snippet(@user, @opts)
      end

      it { @snippet.should be_valid;}
      it { @snippet.author.should == @user }
    end
  end

  def create_snippet(user, opts)
    Snippets::CreateContext.new(user, opts).execute
  end
end
