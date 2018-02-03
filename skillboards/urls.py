from django.urls import path

from skillboards.graphql import schema
from skillboards import views

profile_pattern = 'leaderboard/<slug:board_name>/profile/<int:user_id>'

urlpatterns = [
	path('', views.index, name="index"),
	path('select-board/', views.SelectBoard.as_view(), name='select-board'),
	path('leaderboard/<slug:board_name>', views.leaderboard, name='leaderboard'),
	path(profile_pattern, views.Profile.as_view(), name='profile'),
	path('about/', views.About.as_view(), name='about_page'),
	path('graphql/', schema.view, name="graphql"),
]
