require 'test_helper'

class PagesControllerTest < ActionDispatch::IntegrationTest
 
  test "should get root" do
    get '/'
    assert_response :success
  end

  test "should get home" do
    get home_path
    assert_response :success
  end

  test "should get skills" do
    get skills_path
    assert_response :success
  end

  test "should get education" do
    get education_path
    assert_response :success
  end
  
  test "should get experience" do
    get experience_path
    assert_response :success
  end

  test "should get portfolio" do
    get portfolio_path
    assert_response :success
  end
  
  test "should get contact" do
    get contact_path
    assert_response :success
  end

  test "should get pdf" do
    get pdf_path
    assert_response :success
  end

  test "should get doc" do
    get doc_path
    assert_response :success
  end

  test "should get zip" do
    get zip_path
    assert_response :success
  end

end
