# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-28 20:35
from __future__ import unicode_literals

from django.db import migrations, models
import skillboards.models


class Migration(migrations.Migration):

    dependencies = [
        ('skillboards', '0008_auto_20170528_1900'),
    ]

    operations = [
        migrations.AddField(
            model_name='gameteamplayer',
            name='weight',
            field=models.FloatField(default=1, validators=[skillboards.models.validate_weight]),
        ),
    ]