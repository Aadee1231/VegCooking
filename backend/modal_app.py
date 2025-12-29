import modal

app = modal.App("vegcooking-backend")

image = (
    modal.Image.debian_slim()
    .apt_install("ffmpeg")
    .pip_install_from_requirements("requirements.txt")
    .add_local_dir("./app", "/root/app")
)

@app.function(image=image, secrets=[modal.Secret.from_name("vegcooking-secrets")])
@modal.asgi_app()
def fastapi_app():
    from app.main import cookApp as fastapi
    return fastapi