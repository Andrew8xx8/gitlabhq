var NoteList = {

  notes_path: null,
  target_params: null,
  target_id: 0,
  target_type: null,
  top_id: 0,
  bottom_id: 0,
  loading_more_disabled: false,
  reversed: false,

  init: function(tid, tt, path) {
    this.notes_path = path + ".js";
    this.target_id = tid;
    this.target_type = tt;
    this.reversed = $("#notes-list").is(".reversed");
    this.target_params = "target_type=" + this.target_type + "&target_id=" + this.target_id;

    if(this.reversed) {
      var textarea = $(".note-text");
      $('.note_advanced_opts').hide();
      textarea.css("height", "40px");
      textarea.on("focus", function(){
        $(this).css("height", "80px");
        $('.note_advanced_opts').show();
      });
    }

    // get initial set of notes
    this.getContent();

    disableButtonIfEmptyField(".js-note-text", ".js-comment-button");

    $("#note_attachment").change(function(e){
      var val = $('.input-file').val();
      var filename = val.replace(/^.*[\\\/]/, '');
      $(".file_name").text(filename);
    });

    // Setup note preview
    $(document).on('click', '#preview-link', function(e) {
      $('#preview-note').text('Loading...');

      $(this).text($(this).text() === "Edit" ? "Preview" : "Edit");

      var note_text = $('#note_note').val();

      if(note_text.trim().length === 0) {
        $('#preview-note').text('Nothing to preview.');
      } else {
        $.post($(this).attr('href'), {note: note_text}).success(function(data) {
          $('#preview-note').html(data);
        });
      }

      $('#preview-note, #note_note').toggle();
    });+

    $(document).on("click",
                    ".js-add-diff-note-button",
                    NoteList.addDiffNote);

    // reply to diff notes
    $(document).on("click",
                    ".js-discussion-reply-button",
                    NoteList.replyToDiscussionNote);

    // hide diff note form
    $(document).on("click",
                    ".js-close-discussion-note-form",
                    NoteList.removeDiscussionNoteForm);

    // do some specific housekeeping when removing a diff or discussion note
    $(document).on("click",
                    ".diff_file .js-note-delete," +
                    ".discussion .js-note-delete",
                    NoteList.removeDiscussionNote);

    // remove a note (in general)
    $(document).on("click",
                    ".js-note-delete",
                    NoteList.removeNote);

    // clean up previews for forms
    $(document).on("ajax:complete", ".note-form-holder", function(){
      $(this).find('#preview-note').hide();
      $(this).find('#note_note').show();
    });
  },


  /**
   * Event handlers
   */


  /**
   * Called when clicking on the "add a comment" button on the side of a diff line.
   *
   * Inserts a temporary row for the form below the line.
   * Sets up the form and shows it.
   */
  addDiffNote: function(e) {
    // find the form
    var form = $(".js-note-forms .js-discussion-note-form");
    var row = $(this).closest("tr");
    var nextRow = row.next();

    // does it already have notes?
    if (nextRow.is(".notes_holder")) {
      $.proxy(NoteList.replyToDiscussionNote,
              nextRow.find(".js-discussion-reply-button")
             ).call();
    } else {
      // add a notes row and insert the form
      row.after('<tr class="notes_holder js-temp-notes-holder"><td class="notes_line" colspan="2"></td><td class="notes_content"></td></tr>');
      form.clone().appendTo(row.next().find(".notes_content"));

      // show the form
      NoteList.setupDiscussionNoteForm($(this), row.next().find("form"));
    }

    e.preventDefault();
  },

  /**
   * Called in response to deleting a note on a diff line.
   *
   * Removes the actual note from view.
   * Removes the whole notes row if the last note for that line is being removed.
   *
   * Note: must be called before removeNote()
   */
  removeDiscussionNote: function() {
    var notes = $(this).closest(".notes");

    // check if this is the last note for this line
    if (notes.find(".note").length === 1) {
      // for discussions
      notes.closest(".discussion").remove();

      // for diff lines
      notes.closest("tr").remove();
    }
  },

  /**
   * Called in response to "cancel" on a diff note form.
   * 
   * Shows the reply button again.
   * Removes the form and if necessary it's temporary row.
   */
  removeDiscussionNoteForm: function(e) {
    var form = $(this).closest("form");
    var row = form.closest("tr");

    // show the reply button (will only work for replys)
    form.prev(".js-discussion-reply-button").show();

    if (row.is(".js-temp-notes-holder")) {
      // remove temporary row for diff lines
      row.remove();
    } else {
      // only remove the form
      form.remove();
    }

    e.preventDefault();
  },

  /**
   * Called in response to deleting a note of any kind.
   *
   * Removes the actual note from view.
   */
  removeNote: function() {
    $(this).closest(".note").remove();
    NoteList.updateVotes();
  },

  /**
   * Called when clicking on the "reply" button for a diff line.
   *
   * Shows the note form below the notes.
   */
  replyToDiscussionNote: function() {
    // find the form
    var form = $(".js-note-forms .js-discussion-note-form");

    // hide reply button
    $(this).hide();
    // insert the form after the button
    form.clone().insertAfter($(this));

    // show the form
    NoteList.setupDiscussionNoteForm($(this), $(this).next("form"));
  },

  /**
   * Shows the diff line form and does some setup.
   *
   * Sets some hidden fields in the form.
   *
   * Note: "this" must have the "discussionId", "lineCode", "noteableType" and
   *       "noteableId" data attributes set.
   */
  setupDiscussionNoteForm: function(data_holder, form) {
    // setup note target
    form.attr("rel", data_holder.data("discussionId"));
    form.find("#note_line_code").val(data_holder.data("lineCode"));
    form.find("#note_noteable_type").val(data_holder.data("noteableType"));
    form.find("#note_noteable_id").val(data_holder.data("noteableId"));

    // setup interaction
    disableButtonIfEmptyField(form.find(".js-note-text"), form.find(".js-comment-button"));
    GitLab.GfmAutoComplete.setup();

    // cleanup after successfully creating a diff note
    form.on("ajax:success", NoteList.removeDiscussionNoteForm);

    form.show();
  },


  /**
   * Handle loading the initial set of notes.
   * And set up loading more notes when scrolling to the bottom of the page.
   */


  /**
   * Gets an inital set of notes.
   */
  getContent: function() {
    $.ajax({
      url: this.notes_path,
      data: this.target_params,
      complete: function(){ $('.notes-status').removeClass("loading")},
      beforeSend: function() { $('.notes-status').addClass("loading") },
      dataType: "script"
    });
  },

  /**
   * Called in response to getContent().
   * Replaces the content of #notes-list with the given html.
   */
  setContent: function(newNoteIds, html) {
    this.top_id = newNoteIds.first();
    this.bottom_id = newNoteIds.last();
    $("#notes-list").html(html);

    if (this.reversed) {
      // init infinite scrolling
      this.initLoadMore();

      // init getting new notes
      this.initRefreshNew();
    }
  },


  /**
   * Handle loading more notes when scrolling to the bottom of the page.
   * The id of the last note in the list is in this.bottom_id.
   *
   * Set up refreshing only new notes after all notes have been loaded.
   */


  /**
   * Initializes loading more notes when scrolling to the bottom of the page.
   */
  initLoadMore: function() {
    $(document).endlessScroll({
      bottomPixels: 400,
      fireDelay: 1000,
      fireOnce:true,
      ceaseFire: function() {
        return NoteList.loading_more_disabled;
      },
      callback: function(i) {
        NoteList.getMore();
      }
    });
  },

  /**
   * Gets an additional set of notes.
   */
  getMore: function() {
    // only load more notes if there are no "new" notes
    $('.loading').show();
    $.ajax({
      url: this.notes_path,
      data: this.target_params + "&loading_more=1&" + (this.reversed ? "before_id" : "after_id") + "=" + this.bottom_id,
      complete: function(){ $('.notes-status').removeClass("loading")},
      beforeSend: function() { $('.notes-status').addClass("loading") },
      dataType: "script"
    });
  },

  /**
   * Called in response to getMore().
   * Append notes to #notes-list.
   */
  appendMoreNotes: function(newNoteIds, html) {
    var lastNewNoteId = newNoteIds.last();
    if(lastNewNoteId != this.bottom_id) {
      this.bottom_id = lastNewNoteId;
      $("#notes-list").append(html);
    }
  },

  /**
   * Called in response to getMore().
   * Disables loading more notes when scrolling to the bottom of the page.
   * Initalizes refreshing new notes.
   */
  finishedLoadingMore: function() {
    this.loading_more_disabled = true;

    // from now on only get new notes
    if (!this.reversed) {
      this.initRefreshNew();
    }
    // make sure we are up to date
    this.updateVotes();
  },


  /**
   * Handle refreshing and adding of new notes.
   *
   * New notes are all notes that are created after the site has been loaded.
   * The "old" notes are in #notes-list the "new" ones will be in #new-notes-list.
   * The id of the last "old" note is in this.bottom_id.
   */


  /**
   * Initializes getting new notes every n seconds.
   */
  initRefreshNew: function() {
    setInterval("NoteList.getNew()", 10000);
  },

  /**
   * Gets the new set of notes.
   */
  getNew: function() {
    $.ajax({
      url: this.notes_path,
      data: this.target_params + "&loading_new=1&after_id=" + (this.reversed ? this.top_id : this.bottom_id),
      dataType: "script"
    });
  },

  /**
   * Called in response to getNew().
   * Replaces the content of #new-notes-list with the given html.
   */
  replaceNewNotes: function(newNoteIds, html) {
    $("#new-notes-list").html(html);
    this.updateVotes();
  },

  /**
   * Adds a single note to #new-notes-list.
   */
  appendNewNote: function(id, html) {
    if (this.reversed) {
      $("#notes-list").prepend(html);
    } else {
      $("#notes-list").append(html);
    }
    this.updateVotes();
  },

  appendNewDiscussionNote: function(discussionId, diffRowHtml, noteHtml) {
    // is this the first note of discussion?
    var row = $("form[rel='"+discussionId+"']").closest("tr");
    if (row.is(".js-temp-notes-holder")) {
      // insert the note and the reply button after it
      row.after(diffRowHtml);
      // will be added again below
      row.next().find(".note").remove();
    }

    // append new note to all matching discussions
    $(".notes[rel='"+discussionId+"']").append(noteHtml);
  },

  /**
   * Recalculates the votes and updates them (if they are displayed at all).
   *
   * Assumes all relevant notes are displayed (i.e. there are no more notes to
   * load via getMore()).
   * Might produce inaccurate results when not all notes have been loaded and a
   * recalculation is triggered (e.g. when deleting a note).
   */
  updateVotes: function() {
    var votes = $("#votes .votes");
    var notes = $("#notes-list").find(".note .vote");

    // only update if there is a vote display
    if (votes.size()) {
      var upvotes = notes.filter(".upvote").size();
      var downvotes = notes.filter(".downvote").size();
      var votesCount = upvotes + downvotes;
      var upvotesPercent = votesCount ? (100.0 / votesCount * upvotes) : 0;
      var downvotesPercent = votesCount ? (100.0 - upvotesPercent) : 0;

      // change vote bar lengths
      votes.find(".bar-success").css("width", upvotesPercent+"%");
      votes.find(".bar-danger").css("width", downvotesPercent+"%");
      // replace vote numbers
      votes.find(".upvotes").text(votes.find(".upvotes").text().replace(/\d+/, upvotes));
      votes.find(".downvotes").text(votes.find(".downvotes").text().replace(/\d+/, downvotes));
    }
  }
};
