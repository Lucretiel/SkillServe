from django.urls import path

from skillboards.graphql import schema
from skillboards import views

urlpatterns = [
	path('', views.index, name="index"),
	path('about/', views.about_page, name='about_page'),
	path('graphql/', schema.view, name="graphql"),
]
