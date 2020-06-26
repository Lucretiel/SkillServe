# SkillServe
An insecure server for managing TrueSkill leaderboards

SkillServe is a web application implementing a competitive leaderboard. It is currently designed for games like Crokinole, which are played in 2 teams of 1 or 2 players and where draws are impossible.

To run:

- Run `make all` to build the frontend javascript files into a bundle with webpack.
- If you haven't already, initialize your database with `manage.py migrate`.
- Run the django application. It uses whitenoise in production to handle hosting all of the static files. See the `settings.py` file to see the relevant environment variables you should provide.
- In order to use a leaderboard, you will have to use the django admin to create a new "board", then distribute the name of that board to your users. SkillServe is insecure for convenience: when a use signs in with an unrecognized username, a profile will automatically be created for them.
