import graphene
from graphene_django.views import GraphQLView

from .query import Query
from .mutation import Mutation

schema = graphene.Schema(query=Query, mutation=Mutation)
view = GraphQLView.as_view(graphiql=True, schema=schema)
