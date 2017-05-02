from django.contrib import admin
from skillboards import models


# Register your models here.

@admin.register(models.Board)
class BoardAdmin(admin.ModelAdmin):
    pass


@admin.register(models.Player)
class PlayerAdmin(admin.ModelAdmin):
    pass
