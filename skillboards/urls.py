from django.conf.urls import include
from django.conf.urls import url

from skillboards import views

urlpatterns = [
    url(r'^boards/(?P<board_name>[a-zA-Z0-9_-]+)/', include([
        url(r'^$', views.board_detail),
        url(r'^players/', include([
            url(r'^$', views.player_list),
            url(r'^(?P<username>[a-zA-Z0-9_-]+)$', views.player_detail),
            url(r'^(?P<username>[a-zA-Z0-9_-]+)/recent_game$', views.player_recent_game),
        ])),
        url(r'^register$', views.register),
        url(r'^partial_game$', views.PartialGameView.as_view()),
        url(r'^full_game$', views.game),
    ])),
    url(r'^poke$', views.poke),
]
