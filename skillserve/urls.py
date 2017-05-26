"""skillserve URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.11/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""

from logging_tree.format import build_description

from django.conf.urls import include
from django.conf.urls import url
from django.contrib import admin

from rest_framework import renderers
from rest_framework.decorators import api_view
from rest_framework.decorators import renderer_classes
from rest_framework.response import Response


class PlainTextRenderer(renderers.BaseRenderer):
    media_type = 'text/plain'
    format = 'txt'

    def render(self, data, media_type=None, renderer_context=None):
        return data.encode(self.charset)


@api_view()
@renderer_classes((PlainTextRenderer,))
def log_tree(request):
    return Response(build_description())


urlpatterns = [
    url(r'^api/', include('skillboards.urls')),
    url(r'^admin/', admin.site.urls),
    url(r'^', include('skillstatic.urls'))
]
