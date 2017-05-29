import hashlib

from functools import lru_cache

from django.http import HttpResponse
from django.shortcuts import redirect
from django.template import loader
from django.views.decorators.http import condition


@lru_cache()
def grab_template():
    return loader.get_template('skillstatic/index.html').render()


@lru_cache()
def template_hash():
    m = hashlib.sha3_256()
    m.update(grab_template().encode())
    return m.hexdigest()


def compute_etag(request):
    return template_hash()


@condition(etag_func=compute_etag)
def index(request):
    return HttpResponse(grab_template())


def redirectGame(request):
    return redirect('/main/leaderboard', permanent=True)
