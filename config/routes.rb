Rails.application.routes.draw do
  
  root 'pages#home'
 

  get 'education' => 'pages#education', as: :education

get 'experience' => 'pages#experience', as: :experience

get 'contact' => 'pages#contact', as: :contact
  # For details on the DSL available within this file, see http://guides.rubyonrails.org/routing.html
end
