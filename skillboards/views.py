from django.shortcuts import render, redirect


def index(request):
	return render(request, "skillboards/base.html")


def about_page(request):
	return render(request, "skillboards/about.html")
