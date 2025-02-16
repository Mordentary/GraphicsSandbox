# Collect all source files
file(GLOB_RECURSE SOURCES 
    "*.cpp"
)

# Create executable
add_executable(${PROJECT_NAME} ${SOURCES})

# Set the subsystem to WINDOWS to use WinMain instead of main
set_target_properties(${PROJECT_NAME} PROPERTIES LINK_FLAGS "/SUBSYSTEM:WINDOWS")

# Link against the cinder library
target_link_libraries(${PROJECT_NAME} PRIVATE cinder)

# Add include directories
target_include_directories(${PROJECT_NAME}
    PRIVATE
        ${PROJECT_SOURCE_DIR}/include
        ${PROJECT_SOURCE_DIR}/src
)

# Post-build command to copy the assets folder
add_custom_command(TARGET ${PROJECT_NAME} POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        ${CMAKE_SOURCE_DIR}/assets
        $<TARGET_FILE_DIR:${PROJECT_NAME}>/assets
    COMMENT "Copying assets folder to output directory..."
)

# Install the target executable to the bin directory
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)
