from django import forms

from skillboards import models


class SelectBoard(forms.Form):
	name = forms.SlugField(label="Leaderboard Code")

	def clean_name(self):
		board_name = self.cleaned_data['name']

		if models.Board.objects.filter(name=board_name).exists():
			return board_name
		else:
			raise forms.ValidationError(
				"Leadboard with code %(board_code)s does not exist",
				params={"board_code": board_name},
				code="does_not_exist"
			)
