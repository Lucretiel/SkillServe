import falcon
import json
import os

from skillserve.resources import resources

application = app = falcon.API()

app.add_route('/boards/', resources.BoardList())
app.add_route('/boards/{board_name}', resources.Board())
app.add_route('/boards/{board_name}/players/', resources.BoardPlayerList())
app.add_route('/boards/{board_name}/players/{username}', resources.Player())
app.add_route('/boards/{board_name}/games/', resources.Games())


class HelloRoute:
    message = json.dumps({"message": "Hello World!"}).encode()

    def on_get(self, req, resp):
        resp.data = self.message


app.add_route('/', HelloRoute())


class EnvRoute:
    def on_get(self, req, resp):
        resp.data = json.dumps(
            os.environ,
            indent=2,
            separators=(',', ': ')
        ).encode()


app.add_route('/environ', EnvRoute())
