from django.urls import path

from skillboards.graphql import schema
from skillboards import views

urlpatterns = [
	path('', views.index, name="index"),
	path('select-board/', views.SelectBoard.as_view(), name='select-board'),
	path('leaderboard/<slug:board_name>',
	     views.Leaderboard.as_view(), name='leaderboard'),
	path('leaderboard/<slug:board_name>/profile/<int:user_id>',
	     views.Profile.as_view(), name='profile'),
	path('about/', views.About.as_view(), name='about_page'),
	path('logout/', views.logout, name='logout'),
	path('graphql/', schema.view, name="graphql"),
]
