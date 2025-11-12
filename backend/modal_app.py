import modal

app = modal.App("vegcooking-backend")

image = (
    modal.Image.debian_slim()
    .pip_install_from_requirements("requirements.txt")
)

@app.function(image=image, secrets=[modal.Secret.from_name("vegcooking-secrets")])
@modal.asgi_app()
def fastapi_app():
    # Import inside the function so the environment is ready
    from app import app as fastapi
    return fastapi
