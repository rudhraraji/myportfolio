if ENV['AWS_ACCESS_KEY_ID'].present? && ENV['AWS_SECRET_ACCESS_KEY'].present? && ENV['S3_BUCKET'].present?
  Aws.config.update({
    region: ENV['AWS_REGION'] || 'ap-southeast-2',
    credentials: Aws::Credentials.new(ENV['AWS_ACCESS_KEY_ID'], ENV['AWS_SECRET_ACCESS_KEY'])
  })
  S3_BUCKET = Aws::S3::Resource.new.bucket(ENV['S3_BUCKET'])
end