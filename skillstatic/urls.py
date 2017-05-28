from django.conf.urls import url

from skillstatic import views

urlpatterns = [url(pattern, views.index) for pattern in [
    r'^$', r'^login/?$', r'^main/?$',
    r'^main/(?:leaderboard|profile|about)/?$'
]]
