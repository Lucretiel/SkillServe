from rest_framework import serializers

from skillboards import models


class PlayerSerializer(serializers.ModelSerializer):
    skill = serializers.FloatField(read_only=True)

    class Meta:
        model = models.Player

        fields = [
            "username",
            "print_name",
            "skill",

            "mu",
            "sigma",
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
        ]


class PlayerRegisterSerializer(serializers.Serializer):
    username = serializers.SlugField()
    print_name = serializers.CharField(max_length=255, required=False, allow_null=True, default="")


class GameSerializer(serializers.Serializer):
    class TeamSerializer(serializers.Serializer):
        class PlayerSerializer(serializers.Serializer):
            username = serializers.SlugField()
            weight = serializers.FloatField(min_value=0, max_value=1, default=1)

            def to_internal_value(self, data):
                if isinstance(data, str):
                    data = {"username": data}
                return super().to_internal_value(data)

        players = serializers.ListField(child=PlayerSerializer(), min_length=1)
        rank = serializers.IntegerField(min_value=0)
    teams = serializers.ListField(child=TeamSerializer(), min_length=2)
