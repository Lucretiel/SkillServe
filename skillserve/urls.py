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

from logging_tree import build_description

from django.conf.urls import include
from django.conf.urls import url
from django.contrib import admin

from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view()
def log_tree(request):
    return Response(build_description())


urlpatterns = [
    url(r'^api/', include('skillboards.urls')),
    url(r'^admin/', admin.site.urls),
    url(r'^loggers$', log_tree)
]
