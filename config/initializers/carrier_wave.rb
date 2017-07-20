if Rails.env.production?
  CarrierWave.configure do |config|
  	config.fog_provider = 'fog/aws'
    config.fog_credentials = {
      # Configuration for Amazon S3
      :provider              => 'AWS',
      :aws_access_key_id     => ENV['S3_ACCESS_KEY'],
      :aws_secret_access_key => ENV['S3_SECRET_KEY']
      :region   			 => 'ap-southeast-2',
    }
    config.fog_directory     =  ENV['S3_BUCKET']
  end
end

#AccessKey = AKIAJPDLVCC7RNBTLISA
#SecretKey = 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
#S3Bucket  = rudhraraji