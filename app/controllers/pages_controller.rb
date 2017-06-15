class PagesController < ApplicationController
  
  def home
  end

  def skills
  end

  def education
  end

  def experience
  end

  def portfolio
  end

  def contact
  end

  def pdf
    send_file Rails.root.join('private', 'resume.pdf'), :type=>"application/pdf", :x_sendfile=>true
  end

  def doc
    send_file Rails.root.join('private', 'resume.docx'), :type=>"application/docx", :x_sendfile=>true
  end

  def zip
    send_file Rails.root.join('private', 'resume.zip'), :type=>"application/zip", :x_sendfile=>true
  end
end
