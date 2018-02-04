from django.shortcuts import redirect
from django.views import generic
from django.urls import reverse_lazy
from django.views.decorators.http import require_POST

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

	success_url = reverse_lazy('index')

	def form_valid(self, form):
		board_name = self.request.session['selected_board'] = form.cleaned_data['name']
		return redirect('leaderboard', board_name=board_name)

	def form_invalid(self, form):
		self.request.session.pop('selected_board', None)
		return self.render_to_response(
			context=self.get_context_data(form=form),
			status=400)

	# TODO: Make a django PR that adds a step to add a status code to form_invalid


class Leaderboard(generic.DetailView):
	model = models.Board
	template_name = "skillboards/leaderboard.html"

	slug_field = "name"
	slug_url_kwarg = "board_name"


class Profile(generic.DetailView):
	model = models.Player
	template_name = 'skillboards/profile.html'

	slug_field = 'board__name'
	slug_url_kwarg = 'board_name'
	pk_url_kwarg = 'user_id'

	query_pk_and_slug = True


@require_POST
def logout(request):
	request.session.pop('selected_board', None)
	return redirect("index")
