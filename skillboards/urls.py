from django.conf.urls import url

from graphene_django.views import GraphQLView
from skillboards.graphql import schema

urlpatterns = [
    url('graphql', GraphQLView.as_view(graphiql=True, schema=schema.schema))
]
