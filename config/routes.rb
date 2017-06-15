Rails.application.routes.draw do

  	root 'pages#home'
  	get 'home', to: 'pages#home'
	get 'skills', to: 'pages#skills'
	get 'experience', to:'pages#experience'
	get 'education', to:'pages#education'
	get 'portfolio', to: 'pages#portfolio'
	get 'contact', to: 'pages#contact'
	get 'doc', to: 'pages#doc'
	get 'zip', to: 'pages#zip'
	get 'pdf', to: 'pages#pdf'

# For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end

