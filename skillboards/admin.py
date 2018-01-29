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

    def recalculate_skills(self, request, queryset):
        for board in queryset:
            models.update_all_rankings(board)

    recalculate_skills.description = "Recalculate all skills"

    actions = [recalculate_skills]


@admin.register(models.Player)
class PlayerAdmin(admin.ModelAdmin):
    def skill(self, instance):
        return instance.skill

    readonly_fields = ['skill']
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
    list_filter = ['board', 'teams__players__player']
    ordering = ['-time']
