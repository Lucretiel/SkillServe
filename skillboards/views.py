from django.shortcuts import redirect
from django.views import generic

from skillboards import forms, models


def index(request):
	selected = request.session.get('selected_board', None)

	if selected:
		return redirect('leaderboard', board_name=selected)
	else:
		return redirect('select-board')


class About(generic.TemplateView):
	template_name = "skillboards/about.html"


class SelectBoard(generic.FormView):
	template_name = "skillboards/select-board.html"
	form_class = forms.SelectBoard

	def form_valid(self, form):
		board_name = form.cleaned_data['name']
		self.request.session['selected_board'] = board_name
		return redirect('leaderboard', board_name=board_name)

	def form_invalid(self, form):
		self.request.session.pop('selected_board', None)
		return self.render_to_response(
			context=self.get_context_data(form=form),
			status=400)

	# TODO: Make a django PR that adds a step to add a status code to form_invalid


def leaderboard(request, board_name):
	pass


class Profile(generic.DetailView):
	model = models.Player
	template_name = 'skillboards/profile.html'
	http_method_names = ['get']

	slug_field = 'board__name'
	slug_url_kwarg = 'board_name'
	pk_url_kwarg = 'user_id'

	query_pk_and_slug = True
