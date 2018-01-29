# TODO List

Things on this list are sorted by when I thought of them

- Nav Menu auto collapses after click
- Remove skill tiers
- Clustering?
- Generalize submission form for other game types
- Display rank changes on recent game view
- Store rank changes in games
    - Or recalculate them on the fly, maybe? Too expensive?
    - cacheing?
- Simplify flow; don't require login to view / edit leaderboard
- View other player's profiles
- Compare profiles
- Graphs!
- Spin router out into its own library
    - May not be worth it if we're gonna abandon redux anyway
    - Figure out why the initial location dispatch can't happen when middleware is installed
- Make signing in / account creation not stupid
- Partial rewrite– use django templates, authentication
- Kill redux
- Kill the stupid authentication layer in the frontend
- If possible, reduce the react app to just be after login
    - Why even bother with login? Just distribute the board key and be done with it
- Separate 2v2 and 1v1 leaderboards
