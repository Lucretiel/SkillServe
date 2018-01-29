# SkillServe
An insecure server for managing TrueSkill leaderboards

## Page flow:

```
/ => redirect to /login/board
/login/board: select board, then move to /login/user
/login/user: select or create new user, POST to django, then /
/: Main leaderboard page. Submit games etc
/profile/[username]: Profile page
/about
/games: Games list
/static/*: Static assets
/api/ Api stuff


```
