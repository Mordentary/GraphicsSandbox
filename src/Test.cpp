#include <Test.hpp>

void BasicApp::keyDown(KeyEvent event)
{
	if (event.getCode() == KeyEvent::KEY_w)
		mKeyW = true;
	else if (event.getCode() == KeyEvent::KEY_s)
		mKeyS = true;
	else if (event.getCode() == KeyEvent::KEY_d)
		mKeyD = true;
	else if (event.getCode() == KeyEvent::KEY_a)
		mKeyA = true;
	else if (event.getCode() == KeyEvent::KEY_ESCAPE)
		quit();
}

void BasicApp::keyUp(KeyEvent event)
{
	if (event.getCode() == KeyEvent::KEY_w)
		mKeyW = false;
	else if (event.getCode() == KeyEvent::KEY_s)
		mKeyS = false;
	else if (event.getCode() == KeyEvent::KEY_d)
		mKeyD = false;
	else if (event.getCode() == KeyEvent::KEY_a)
		mKeyA = false;
}

void BasicApp::mouseDown(MouseEvent event)
{
	mLastMousePos = event.getPos();
}

void BasicApp::mouseMove(MouseEvent event)
{
}

void BasicApp::mouseDrag(MouseEvent event)
{
	//Only camera process
	if (!event.isRightDown()) return;

	vec2 mousePos = event.getPos();
	vec2 delta = mousePos - mLastMousePos;
	mLastMousePos = mousePos;
	// Sensitivity factor to control look speed.
	float sensitivity = 0.005f;
	mYaw -= delta.x * sensitivity;
	mPitch -= delta.y * sensitivity;

	// Clamp pitch to avoid flipping the camera (limit to ~89° up/down).
	constexpr float pitchLimit = glm::radians(89.0f);
	mPitch = clamp(mPitch, -pitchLimit, pitchLimit);
}

void BasicApp::draw()
{
	mFbo->bindFramebuffer();
	gl::clear(Color::gray(0.1f));
	gl::color(1.0f, 0.5f, 0.25f);
	gl::setMatrices(mCamera);

	m_GLSLProg->bind();
	vec3 billboardPos(0.0f, 1.0f, 0.0f);
	vec2 billboardSize(1.0f, 1.0f);
	vec3 right, up;
	mCamera.getBillboardVectors(&right, &up);
	gl::drawBillboard((mCamera.getViewDirection()) + mCameraPos, vec3(2.0f), 0, right, up);

	mFbo->unbindFramebuffer();

	gl::clear();

	mFbo->blitToScreen(getWindowBounds(), getWindowBounds());
}

void BasicApp::update()
{
	double currentTime = getElapsedSeconds();
	float dt = static_cast<float>(currentTime - mLastTime);
	mLastTime = currentTime;

	vec3 forward;
	forward.x = cos(mPitch) * -sin(mYaw);
	forward.y = sin(mPitch);
	forward.z = -cos(mPitch) * cos(mYaw);
	forward = normalize(forward);

	vec3 right = normalize(cross(forward, vec3(0, 1, 0)));

	vec3 movement(0);
	if (mKeyW) movement += forward;
	if (mKeyS) movement -= forward;
	if (mKeyD) movement += right;
	if (mKeyA) movement -= right;

	if (glm::length(movement) > 0)
		movement = normalize(movement);

	mCameraPos += movement * mSpeed * dt;

	mCamera.lookAt(mCameraPos, mCameraPos + forward, vec3(0, 1, 0));

	m_GLSLProg->uniform("iCameraPos", mCamera.getEyePoint());
	m_GLSLProg->uniform("iCameraInvView", mCamera.getInverseViewMatrix());
	m_GLSLProg->uniform("iCameraInvProj", glm::inverse(mCamera.getProjectionMatrix()));

	m_GLSLProg->uniform("iResolution", vec2(getWindowWidth(), getWindowHeight()));
	m_GLSLProg->uniform("iTime", static_cast<float>(getElapsedSeconds()));
}

void BasicApp::setup()
{
	mCameraPos = vec3(0, 1.6f, 5.0f);
	mYaw = 0.0f;
	mPitch = 0.0f;
	mKeyW = mKeyA = mKeyS = mKeyD = false;
	mSpeed = 5.0f;
	mCamera.setPerspective(90.0f, getWindowAspectRatio(), 0.000001f, 100.0f);
	mCamera.lookAt(mCameraPos, mCameraPos + vec3(0, 0, -1), vec3(0, 1, 0));

	mLastTime = getElapsedSeconds();

	try {
		m_Texture = gl::Texture::create(loadImage("assets/textures/joker_image.jpeg"), gl::Texture::Format().mipmap(true));
		CI_LOG_D("Loaded texture");
	}
	catch (const std::exception& e) {
		CI_LOG_E("Texture Error: " << e.what());
	}

	CI_ASSERT(m_Texture, "Texture is not here!");
	m_GLSLProg = gl::GlslProg::create(loadAsset("shaders/rayMarching.vert"), loadAsset("shaders/rayMarching.frag"));

	//m_Batch = gl::Batch::create(geom::bil(), m_GLSLProg);
	gl::enableFaceCulling(false);
	gl::enableDepthRead();
	gl::enableDepthWrite();
	gl::Fbo::Format fboFormat;
	fboFormat.setColorTextureFormat(gl::Texture2d::Format().internalFormat(GL_RGBA8));
	fboFormat.enableDepthBuffer(true);
	mFbo = gl::Fbo::create(getWindowWidth(), getWindowHeight(), fboFormat);
	mBillboard = std::make_unique<Billboard>();

	if (!mFbo)
		CI_LOG_E("FBO is incomplete!");
}

void prepareSettings(BasicApp::Settings* settings)
{
	settings->setMultiTouchEnabled(false);
	ivec2 windowSize(2560, 1440);
	settings->setWindowSize(windowSize);

	auto display = Display::getMainDisplay();
	Area bounds = display->getBounds();

	int posX = bounds.getWidth() / 2 - windowSize.x / 2;
	int posY = bounds.getHeight() / 2 - windowSize.y / 2;
	settings->setWindowPos(ivec2(posX, posY));
}