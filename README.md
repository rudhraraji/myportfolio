# README

This README would normally document whatever steps are necessary to get the
application up and running.

Things you may want to cover:

* Ruby version: 2.6.10

* System dependencies: rbenv, ruby-build, bundler, SQLite (development), PostgreSQL (production)

* Configuration: Use `RAILS_ENV=development` locally and run `bundle install --without production` for dev setup.

* Database creation: `bundle exec rake db:create db:migrate` (use PostgreSQL in production or SQLite in development)

* Database initialization: `bundle exec rake db:seed` (if seeds exist)

* How to run the test suite: `bundle exec rails test`

* Services (job queues, cache servers, search engines, etc.): none required for local development.

* Deployment instructions: install the specified Ruby version, run `bundle install --without production` locally, and use `bundle exec puma -C config/puma.rb` or a Rails-capable host.

* ...

## Setup

1. Install `rbenv` and `ruby-build`.
2. Run `rbenv install 2.6.10`.
3. Run `bundle config set path 'vendor/bundle'`.
4. Run `bundle install`.
5. Run `bundle exec rails server`.
