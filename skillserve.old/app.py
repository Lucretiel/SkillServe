import falcon
import os

from skillserve.resources import resources

BOOL_STATES = {
    '0': False, '1': True,
    'false': False, 'true': True,
    'no': False, 'yes': True,
    'off': False, 'on': True,
    '': False
}


def parse_bool_env(value):
    try:
        return BOOL_STATES[value.lower()]
    except KeyError:
        raise ValueError('{} is not a valid bool flag'.format(value))


application = app = falcon.API()

app.add_route('/boards/', resources.BoardList())
app.add_route('/boards/{board_name}', resources.Board())
app.add_route('/boards/{board_name}/players/', resources.BoardPlayerList())
app.add_route('/boards/{board_name}/players/{username}', resources.Player())
app.add_route('/boards/{board_name}/games/', resources.Games())

if parse_bool_env(os.environ.get('DEBUG', '')):
    app.add_route('/', resources.HelloRoute())
    app.add_route('/environ', resources.EnvRoute())
