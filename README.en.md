<p align="right">
    <a href="./README.md">中文</a> | <strong>English</strong>
</p>


<div align="center">

# Blog

_✨ Node.js based blog system ✨_

</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/ionce007/blog/master/LICENSE">
    <img src="https://img.shields.io/github/license/ionce007/blog?color=brightgreen" alt="license">
  </a>
  <a href="https://github.com/ionce007/blog/releases/latest">
    <img src="https://img.shields.io/github/v/release/ionce007/blog?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://github.com/ionce007/blog/releases/latest">
    <img src="https://img.shields.io/github/downloads/ionce007/blog/total?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://hub.docker.com/repository/docker/justsong/blog">
    <img src="https://img.shields.io/docker/pulls/justsong/blog?color=brightgreen" alt="docker pull">
  </a>
</p>

<p align="center">
  <a href="https://cms.foryet.com/">Demo</a>
  ·
  <a href="https://github.com/ionce007/blog/blob/master/README.en.md#deployment">Tutorial</a>
  ·
  <a href="https://github.com/ionce007/blog/issues">Feedback</a>
</p>

## Description
+ This is a blog system powered by Express.js and React.
+ Demonstrations
    + [My blog](https://cms.foryet.com/) (may not be the latest version).
    + [Heroku App](https://express-react-blog.herokuapp.com/) (visit the [management system](https://express-react-blog.herokuapp.com/admin/) with default username `admin` )

## Highlights
1. You can use a **code editor** to edit your content (built-in ACE code editor with multiple themes).
2. Easy to configure and integrate with disqus and statistics system.
3. You can copy from OneNote or any other programs and **paste your content with formatting** (with the `paste with formatting` feature, don't forget to set the page type to `raw`).
4. You can use this to deploy your single page web application (such as a [game]), just paste the code and set the page type to `raw`.
5. System deploy is extremely simple, no need to configure the database (here I use SQLite as the default database, but it's easy to move to other database, just by modifying the `knexfile.js`).
6. **Multiple themes available**:
    1. Bulma: default theme.
    2. Bootstrap: [blog-theme-bootstrap](https://github.com/ionce007/blog-theme-bootstrap).
    3. W3: [blog-theme-w3](https://github.com/ionce007/blog-theme-w3).
    4. V2EX: [blog-theme-v2ex](https://github.com/ionce007/blog-theme-v2ex).
    5. Next: [blog-theme-next](https://github.com/ionce007/blog-theme-next).
    6. Bootstrap5: [blog-theme-bootstrap5](https://github.com/ionce007/blog-theme-bootstrap5).

## Deployment
```shell script
git clone --recurse-submodules https://github.com/ionce007/chanshuo.git
cd blog
npm install
npm run build  # For Windows user, please run `npm run build2` instead
npm start
```