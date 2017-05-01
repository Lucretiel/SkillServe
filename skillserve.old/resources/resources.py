import json
import os
import shelve
import functools


def returns_json(**json_kwargs):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(self, req, resp, **kwargs):
            result = func(self, req, resp, **kwargs)
            if result is not None:
                resp.data = json.dumps(result, **json_kwargs).encode()

        return wrapper
    return decorator


class HelloRoute:
    message = json.dumps({"message": "Hello World!"}).encode()

    def on_get(self, req, resp):
        resp.data = self.message


class EnvRoute:
    @returns_json(sort_keys=True, indent=2)
    def on_get(self, req, resp):
        return {
            "environment": dict(os.environ),
            "directory": os.listdir(),
        }


sample = {
    "boards": {
        "board1": {
            "game": "Crokinole",
            "description": "Example board",
            "players": {
                "nathanw": {
                    "print_name": "Nathan West",
                    "rank": {
                        "mu": 25,
                        "sigma": 25 / 3
                    },
                },
            },
        },
    },
}



class BoardList:
    def on_get(self, req, resp):
        pass


class Board:
    pass


class BoardPlayerList:
    pass


class Player:
    pass


class Games:
    pass
