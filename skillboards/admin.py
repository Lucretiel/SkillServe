from django.contrib import admin
from nested_inline.admin import NestedModelAdmin
from nested_inline.admin import NestedStackedInline
from skillboards import models


# Core models
class LockInline(admin.TabularInline):
    model = models.BoardLock
    extra = 0


@admin.register(models.Board)
class BoardAdmin(admin.ModelAdmin):
    inlines = [LockInline]


@admin.register(models.Player)
class PlayerAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).with_player_info()

    def skill(self, instance):
        return instance.skill

    def is_provisional(self, instance):
        return instance.is_provisional

    readonly_fields = ('skill', 'is_provisional')
    list_filter = ['board']


# Game models
class GameTeamPlayerInline(NestedStackedInline):
    model = models.GameTeamPlayer
    extra = 0


class GameTeamInline(NestedStackedInline):
    model = models.GameTeam
    extra = 0
    inlines = [GameTeamPlayerInline]


@admin.register(models.Game)
class GameAdmin(NestedModelAdmin):
    inlines = [GameTeamInline]
    list_filter = ['board']


# Partial game models
class PartialGamePlayerInline(admin.TabularInline):
    model = models.PartialGamePlayer
    extra = 0


@admin.register(models.PartialGame)
class PartialGameAdmin(admin.ModelAdmin):
    inlines = [PartialGamePlayerInline]
    list_filter = ['board']
