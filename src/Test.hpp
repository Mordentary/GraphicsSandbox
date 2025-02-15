#pragma once
#include "cinder/app/App.h"
#include "cinder/app/RendererGl.h"
#include "cinder/Log.h"
#include "cinder/gl/gl.h"
#include "billboard.hpp"
using namespace ci;
using namespace ci::app;

class Billboard;
class BasicApp : public App
{
public:
	void mouseDrag(MouseEvent event) override;
	void keyDown(KeyEvent event) override;
	void keyUp(KeyEvent event) override;
	void mouseMove(MouseEvent event);
	void mouseDown(MouseEvent event);
	void draw() override;
	void update() override;
	void setup() override;
private:
	gl::FboRef mFbo;
	gl::BatchRef		m_Batch;
	gl::TextureRef		m_Texture;
	gl::GlslProgRef		m_GLSLProg;
	glm::mat4			m_CubeRotationMat;
	std::unique_ptr<Billboard> mBillboard;

	CameraPersp mCamera;
	vec3        mCameraPos;
	float       mYaw;
	float       mPitch;

	bool mKeyW, mKeyA, mKeyS, mKeyD;

	double mLastTime;
	float  mSpeed;

	vec2 mLastMousePos;
};

void prepareSettings(BasicApp::Settings* settings);