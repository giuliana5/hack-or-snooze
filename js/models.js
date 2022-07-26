"use strict";

const baseUrl = () => "https://hack-or-snooze-v3.herokuapp.com";

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */
  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */
  getHostName() {
    const hostName = new URL(this.url).host;
    return hostName;
  }
}

/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */
class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */
  static async getStories() {

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${baseUrl()}/stories`,
      method: "GET",
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */
  async addStory(user, newStory) {
    const token = user.loginToken;

    // adds a new story to the API
    const res = await axios({url: `${baseUrl()}/stories`, method: "POST", data: {token, story: newStory}});

    // create new instance of the story class
    const story = new Story(res.data.story);

    this.stories.unshift(story);
    user.ownStories.unshift(story);
    return story;
  }

  async removeStory(user, storyId) {
    const token = user.loginToken;

    // removes the user's story from the API
    await axios({
      url: `${baseUrl()}/stories/${storyId}`,
      method: "DELETE",
      data: {token: token}
    });

    // remove story from saved user info
    this.stories = this.stories.filter(story => story.storyId !== storyId);
    user.ownStories = user.ownStories.filter(story => story.storyId !== storyId);
    user.favorites = user.favorites.filter(story => story.storyId !== storyId);
  }
}

/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */
class User {

  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */
  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */
  static async signup(username, password, name) {
    const response = await axios({
      url: `${baseUrl()}/signup`,
      method: "POST",
      data: { user: { username, password, name } },
    });

    let { user } = response.data

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */
  static async login(username, password) {
    const response = await axios({
      url: `${baseUrl()}/login`,
      method: "POST",
      data: { user: { username, password } },
    });

    let { user } = response.data;

    return new User(
      {
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
        favorites: user.favorites,
        ownStories: user.stories
      },
      response.data.token
    );
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */
  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${baseUrl()}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  // store favorite story to user data
  async addFavorite(story) {
    this.favorites.push(story);

    // save as favorite in the API
    await this.addOrRemoveFav("POST", story);
  }

  // remove favorite story from user saved data
  async removeFavorite(story) {
    this.favorites.filter(s => s.storyId !== story.storyId);

    // remove in the API
    await this.addOrRemoveFav("DELETE", story);
  }

  // sends a post method to add or remove favorites
  async addOrRemoveFav(method, story) {
    const token = this.loginToken;
    await axios({
      url: `${baseUrl()}/users/${this.username}/favorites/${story.storyId}`,
      method: method,
      data: {token: token}
    });
  }

  // checks if a story is saved as a favorite
  isFavorite(story) {
    return this.favorites.some(s => s.storyId === story.storyId);
  }
}
