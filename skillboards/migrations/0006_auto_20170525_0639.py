# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-25 06:39
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('skillboards', '0005_auto_20170522_0851'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gameteamplayer',
            name='team',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='players', to='skillboards.GameTeam'),
        ),
    ]