from rest_framework import serializers

from skillboards import models


class PlayerSerializer(serializers.ModelSerializer):
    skill = serializers.FloatField(read_only=True)
    upper_skill = serializers.FloatField(read_only=True)
    is_provisional = serializers.BooleanField(read_only=True)
    quality = serializers.FloatField(
        read_only=True,
        required=False
    )

    class Meta:
        model = models.Player

        fields = [
            "username",
            "print_name",
            "skill",
            "upper_skill",
            "is_provisional",

            "mu",
            "sigma",

            "games",
            "wins",
            "losses",

            "quality",
        ]


class BoardSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Board
        fields = [
            "name",

            "mu",
            "sigma",
            "beta",
            "tau",
            "draw_probability",

            "unlock_time",
        ]


class PlayerRegisterSerializer(serializers.Serializer):
    username = serializers.SlugField()
    print_name = serializers.CharField(
        max_length=255, allow_null=True, default="", allow_blank=True
    )


class GameSerializer(serializers.Serializer):
    class TeamSerializer(serializers.Serializer):
        class PlayerSerializer(serializers.Serializer):
            username = serializers.SlugField(source='player.username')
            weight = serializers.FloatField(default=1)

            def to_internal_value(self, data):
                if isinstance(data, str):
                    data = {"username": data}
                return super().to_internal_value(data)

        players = serializers.ListField(
            child=PlayerSerializer(),
            min_length=1,
            source="players.all")
        rank = serializers.IntegerField(min_value=0)

    teams = serializers.ListField(
        child=TeamSerializer(),
        min_length=2,
        source="teams.all"
    )
    time = serializers.DateTimeField(allow_null=True, required=False, default=None)
