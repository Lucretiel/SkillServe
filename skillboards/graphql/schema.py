from django.views.decorators.csrf import csrf_exempt

import graphene
from graphene_django.views import GraphQLView

from .query import Query
from .mutation import Mutation

schema = graphene.Schema(query=Query, mutation=Mutation)
view = csrf_exempt(GraphQLView.as_view(graphiql=True, schema=schema))
