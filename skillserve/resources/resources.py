import json
import os


class HelloRoute:
    message = json.dumps({"message": "Hello World!"}).encode()

    def on_get(self, req, resp):
        resp.data = self.message


class EnvRoute:
    env = json.dumps(
        dict(os.environ),
        indent=2,
        separators=(',', ': '),
        sort_keys=True,
    ).encode()

    def on_get(self, req, resp):
        resp.data = self.env


class BoardList:
    pass


class Board:
    pass


class BoardPlayerList:
    pass


class Player:
    pass


class Games:
    pass
