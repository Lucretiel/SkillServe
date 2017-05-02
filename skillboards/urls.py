from django.conf.urls import include
from django.conf.urls import url

from skillboards import views

urlpatterns = [
    url(r'^boards/(?P<board_name>[a-zA-Z0-9_-]+)/', include([
        url(r'^$', views.board_detail),
        url(r'^players/$', views.player_list),
        url(r'^players/(?P<username>[a-zA-Z0-9_-]+)$', views.player_detail),
        url(r'^game$', views.game),
        url(r'^register$', views.register),
    ])),
]