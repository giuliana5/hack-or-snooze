"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** Get and show stories when site first loads. */
async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage();
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */
function generateStoryMarkup(story) {
  console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();

  //check if the user is logged in
  const loggedIn = Boolean(currentUser);

  //html markup for individual stories
  return $(`
      <li id="${story.storyId}">
        ${loggedIn ? favoriteHtml(story, currentUser) : ""}
        <a href="${story.url}" target="a_blank" class="story-link">
        ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <small class="story-author">by ${story.author}</small>
        ${loggedIn && currentUser.username === story.username ? `<button class="remove" >X</button>` : ""}
        <small class="story-user">posted by ${story.username}</small>
      </li>
    `);
}

//check is story was marked favorite and add html
function favoriteHtml(story, user) {
  const isFavorite = user.isFavorite(story);
  return `<input class="star" type="checkbox" ${isFavorite ? 'checked' : ""}/>`;
}

/** Gets list of stories from server, generates their HTML, and puts on page. */
function putStoriesOnPage() {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyList.stories) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}

async function postStory(evt) {
  console.debug("postStory", evt);
  evt.preventDefault();

  // retrieve the title, author & url from the DOM
  const title = $("#post-title").val();
  const author = $("#post-author").val();
  const url = $("#post-url").val();

  const username = currentUser.username;

  // adds the story to the API
  const newStory = await storyList.addStory(currentUser, {title, author, url, username});

  // displays the story on the UI
  const storyMarkup = generateStoryMarkup(newStory);
  $allStoriesList.prepend(storyMarkup);
  updateUIOnUserLogin();
  $("#new-post-form").hide();
  $("#new-post-form").trigger("reset");
}

$("#new-post-form").on("submit", postStory);

async function deleteStory(evt) {
  console.debug("deleteStory");

  //remove story from server and markup
  const storyId = evt.target.parentElement.id;
  await storyList.removeStory(currentUser, storyId);
  $(`#${storyId}`).remove();

  //refresh story list
  await putUserStoriesOnPage();
}

$allStoriesList.on("click", ".remove", deleteStory)

async function favoriteStory(evt) {
  console.debug("favoriteStory");

  const storyId = evt.target.parentElement.id;

  // finds the story associated with the story id
  const story = storyList.stories.find(s => s.storyId === storyId);

  // checks if the story was already marked, if so it will remove it and vice versa
  if (currentUser.isFavorite(story)) {
    await currentUser.removeFavorite(story);
  } else {
    await currentUser.addFavorite(story);
  }
}

$allStoriesList.on("click", ".star", favoriteStory);
